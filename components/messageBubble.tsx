export interface MessageBubbleProps {
  message: string;
  sender: "user" | "assistant";
  timestamp: string;
  status?: "stopped" | "error";
}

export default function MessageBubble({message, sender, timestamp, status}: MessageBubbleProps) {
  if (sender === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[76%] bg-accent text-white px-[15px] py-[11px] rounded-[14px_14px_4px_14px] text-[14.5px] leading-[1.55] whitespace-pre-wrap">
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="flex-none w-[26px] h-[26px] rounded-lg border border-line bg-surface flex items-center justify-center font-mono text-[11px] text-accent">
        AI
      </div>
      <div className="min-w-0 flex flex-col gap-1.5">
        <div className="bg-surface border border-line px-[15px] py-[11px] rounded-[4px_14px_14px_14px] text-[14.5px] leading-[1.6] whitespace-pre-wrap text-ink-soft">
          {message}
        </div>
        <div className="font-mono text-[10.5px] text-faint pl-0.5">
          {timestamp}
          {status === "stopped" && " · stopped"}
          {status === "error" && " · failed"}
        </div>
      </div>
    </div>
  );
}