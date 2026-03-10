import { FlaskConical } from "lucide-react";

export default function SandboxPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <FlaskConical className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Sandbox</h1>
      <p className="text-muted-foreground max-w-sm">
        พื้นที่ทดลอง — จะเพิ่มเครื่องมือ What-if และการจำลองสถานการณ์ที่นี่เร็วๆ นี้
      </p>
    </div>
  );
}
