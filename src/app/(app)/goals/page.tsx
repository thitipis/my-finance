"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoalsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/my-data/goals"); }, [router]);
  return null;
}
