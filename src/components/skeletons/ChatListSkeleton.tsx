export const ChatListSkeleton = () => {
  return (
    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-[1.5rem] bg-slate-200 shrink-0"></div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-2">
          <div className="h-5 w-24 bg-slate-200 rounded-lg"></div>
          <div className="h-3 w-12 bg-slate-100 rounded-md"></div>
        </div>
        <div className="h-4 w-3/4 bg-slate-100 rounded-md mb-2"></div>
        <div className="h-3 w-1/2 bg-slate-100 rounded-md"></div>
      </div>
    </div>
  );
};
