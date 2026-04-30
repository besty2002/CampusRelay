export const MessageSkeleton = ({ isOwn }: { isOwn?: boolean }) => {
  return (
    <div className={`flex w-full animate-pulse ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
        {!isOwn && <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 self-end mb-1"></div>}
        <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className={`h-10 w-48 rounded-2xl ${isOwn ? 'bg-lime-200 rounded-br-sm' : 'bg-white rounded-bl-sm'} shadow-sm`}></div>
          <div className="h-3 w-12 bg-slate-100 rounded-md"></div>
        </div>
      </div>
    </div>
  );
};
