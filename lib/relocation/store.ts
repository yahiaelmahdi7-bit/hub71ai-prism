import { mkdirSync } from "node:fs";
import path from "node:path";
import { createEstablishedCompanyDemo } from "./data.ts";
import type { RelocationStoreData } from "./types.ts";

export const EMPTY_STORE: RelocationStoreData = {
  people: [],
  organizations: [],
  programs: [],
  cases: [],
  tasks: [],
  recommendations: {},
  events: [],
  consents: [],
  sessions: [],
  pendingInvites: [],
};

type DatabaseRow = { body: string };
type EventLedgerRow = { body: string };
type StatementSync = {
  get: (...params: unknown[]) => unknown;
  run: (...params: unknown[]) => unknown;
};
type DatabaseSync = {
  exec: (sql: string) => void;
  prepare: (sql: string) => StatementSync;
  close: () => void;
};

const sqlite = process.getBuiltinModule("node:sqlite") as unknown as {
  DatabaseSync: new (path: string) => DatabaseSync;
};

export class SqliteRelocationStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async read(seed = false): Promise<RelocationStoreData> {
    const db = this.open();
    try {
      if (!seed) return this.readWithDb(db, seed);
      db.exec("begin immediate");
      const data = this.readWithDb(db, seed);
      db.exec("commit");
      return data;
    } catch (error) {
      if (seed) db.exec("rollback");
      throw error;
    } finally {
      db.close();
    }
  }

  async write(data: RelocationStoreData): Promise<void> {
    const db = this.open();
    try {
      db.exec("begin immediate");
      this.writeWithDb(db, data);
      db.exec("commit");
    } catch (error) {
      db.exec("rollback");
      throw error;
    } finally {
      db.close();
    }
  }

  async update(mutator: (data: RelocationStoreData) => RelocationStoreData | Promise<RelocationStoreData>, seed = true) {
    const db = this.open();
    try {
      db.exec("begin immediate");
      const current = this.readWithDb(db, seed);
      const next = await mutator(current);
      this.writeWithDb(db, next);
      db.exec("commit");
      return next;
    } catch (error) {
      db.exec("rollback");
      throw error;
    } finally {
      db.close();
    }
  }

  private open(): DatabaseSync {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const db = new sqlite.DatabaseSync(this.filePath);
    db.exec(`
      create table if not exists relocation_documents (
        id text primary key,
        body text not null,
        updated_at text not null
      )
    `);
    db.exec(`
      create table if not exists relocation_event_ledger (
        id text primary key,
        case_id text not null,
        task_id text not null,
        state text not null,
        body text not null,
        created_at text not null
      )
    `);
    return db;
  }

  private readWithDb(db: DatabaseSync, seed: boolean): RelocationStoreData {
    const row = db.prepare("select body from relocation_documents where id = ?").get("current") as DatabaseRow | undefined;
    if (row) {
      return normalizeStore(JSON.parse(row.body) as Partial<RelocationStoreData>);
    }
    const initial = normalizeStore(seed ? createEstablishedCompanyDemo() : EMPTY_STORE);
    if (seed) this.writeWithDb(db, initial);
    return initial;
  }

  private writeWithDb(db: DatabaseSync, data: RelocationStoreData) {
    const existingEvents = new Map<string, string>();
    for (const event of data.events) {
      const body = JSON.stringify(event);
      const row = db.prepare("select body from relocation_event_ledger where id = ?").get(event.id) as EventLedgerRow | undefined;
      if (row && row.body !== body) {
        throw new Error(`Status event ${event.id} is immutable and cannot be rewritten.`);
      }
      existingEvents.set(event.id, body);
    }
    db.prepare(
      "insert into relocation_documents (id, body, updated_at) values (?, ?, ?) on conflict(id) do update set body = excluded.body, updated_at = excluded.updated_at",
    ).run("current", JSON.stringify(data), new Date().toISOString());
    for (const event of data.events) {
      db.prepare(
        "insert or ignore into relocation_event_ledger (id, case_id, task_id, state, body, created_at) values (?, ?, ?, ?, ?, ?)",
      ).run(event.id, event.caseId, event.taskId, event.state, existingEvents.get(event.id), event.updatedAt);
    }
  }
}

export function defaultStorePath() {
  return process.env.BANKABLE_DB_PATH ?? ".bankable/relocation.sqlite";
}

function normalizeStore(data: Partial<RelocationStoreData>): RelocationStoreData {
  return {
    people: data.people ?? [],
    organizations: data.organizations ?? [],
    programs: data.programs ?? [],
    cases: data.cases ?? [],
    tasks: data.tasks ?? [],
    recommendations: data.recommendations ?? {},
    events: data.events ?? [],
    consents: data.consents ?? [],
    sessions: data.sessions ?? [],
    pendingInvites: data.pendingInvites ?? [],
  };
}
