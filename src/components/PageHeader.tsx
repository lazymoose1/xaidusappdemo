import { ReactNode } from "react";
import BrandWordmark from "@/components/BrandWordmark";

interface PageHeaderProps {
  title: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

const PageHeader = ({ title, leftAction, rightAction }: PageHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 app-shell-header z-40 h-[15vh] min-h-[72px]">
      <div className="flex items-center justify-center h-full relative px-4">
        {leftAction && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground cursor-pointer">
            {leftAction}
          </div>
        )}
        <div className="flex flex-col items-center gap-1 px-12 sm:px-16">
          <BrandWordmark compact className="scale-[0.92]" />
          <h1 className="text-sm font-medium tracking-[-0.02em] text-foreground/72 truncate">{title}</h1>
        </div>
        {rightAction && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground cursor-pointer">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
