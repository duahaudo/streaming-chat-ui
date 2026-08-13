import Chat from "@/components/chat";
import Conversations from "@/components/conversation";

export default function Home() {

  return (
    <div className="flex flex-1 min-h-0 h-screen flex-col">
      <header className="flex items-center gap-3 px-5 h-[60px] shrink-0 border-b border-line bg-surface">
        <div className="w-[22px] h-[22px] rounded-md bg-accent" />
        <h1 className="text-base font-semibold tracking-[-0.01em]">Demo Streaming Chat</h1>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="flex flex-col w-[264px] shrink-0 h-full overflow-y-auto border-r border-line bg-surface">
          <Conversations />
        </aside>

        <div className="flex flex-col items-center w-full min-h-0 bg-canvas">
          <Chat />
        </div>
      </div>
    </div>
  );
}
