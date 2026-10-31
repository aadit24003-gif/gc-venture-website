/** Remounts on every navigation, so each store page enters with the same soft rise (CSS only). */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
