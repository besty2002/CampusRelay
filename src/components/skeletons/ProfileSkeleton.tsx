export const ProfileSkeleton = () => {
  return (
    <div className="flex flex-col items-center text-center relative animate-pulse w-full">
      <div className="w-24 h-24 bg-slate-200 rounded-full mb-4 border-4 border-white shadow-lg"></div>
      <div className="h-8 w-40 bg-slate-200 rounded-xl mb-4"></div>
      
      {/* Role Badge Skeleton */}
      <div className="h-6 w-24 bg-slate-100 rounded-full mb-6"></div>
      
      {/* Manner Temp Skeleton */}
      <div className="w-full h-20 bg-slate-50 rounded-[2rem] mb-6"></div>
      
      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-50">
        <div className="flex flex-col items-center">
          <div className="h-3 w-16 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-6 w-8 bg-slate-200 rounded-md"></div>
        </div>
        <div className="flex flex-col items-center border-x border-slate-50">
          <div className="h-3 w-16 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-6 w-12 bg-slate-200 rounded-md"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-3 w-16 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-6 w-8 bg-slate-200 rounded-md"></div>
        </div>
      </div>
    </div>
  );
};
