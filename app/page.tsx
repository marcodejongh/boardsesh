// app/page.tsx
import React from "react";
import BoardForm from './components/BoardForm'; // Import your form component here

export default function Home() {
  return (
    <div>
      <h1>Welcome to Kilter</h1>
      <BoardForm />
    </div>
  );
}
