export const PostCardSkeleton = () => {
  return (
    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex gap-5 animate-pulse relative">
      {/* Thumbnail Skeleton */}
      <div className="w-28 h-28 shrink-0 rounded-[1.5rem] bg-slate-200"></div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          {/* Tags Skeleton */}
          <div className="flex gap-2 mb-2">
            <div className="h-4 w-12 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-16 bg-slate-200 rounded-md"></div>
          </div>
          
          {/* Title Skeleton */}
          <div className="h-6 w-3/4 bg-slate-200 rounded-lg mb-2"></div>
          
          {/* Description Skeleton */}
          <div className="h-4 w-full bg-slate-100 rounded-md"></div>
        </div>
        
        {/* Author Footer Skeleton */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200"></div>
            <div className="h-3 w-16 bg-slate-200 rounded-md"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-20 bg-slate-200 rounded-md"></div>
          </div>
        </div>
      </div>
      
      {/* Heart Button Skeleton */}
      <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100"></div>
    </div>
  );
};
