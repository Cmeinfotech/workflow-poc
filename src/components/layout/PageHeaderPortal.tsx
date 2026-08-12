import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

type PageHeaderPortalContextValue = {
  target: HTMLDivElement | null;
  setTarget: Dispatch<SetStateAction<HTMLDivElement | null>>;
};

export const PageHeaderPortalContext = createContext<PageHeaderPortalContextValue | null>(null);

export function usePageHeaderPortal() {
  return useContext(PageHeaderPortalContext);
}
