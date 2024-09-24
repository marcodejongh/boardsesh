// app/page.tsx
import React from "react";
import { redirect } from "next/navigation";

export default function Home() {
  redirect(`/tension/10/6/12,13/40/list`);
}
