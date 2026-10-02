import { redirect } from "next/navigation";

export default function MoveFinanceRedirect() {
  redirect("/move#budget");
}
