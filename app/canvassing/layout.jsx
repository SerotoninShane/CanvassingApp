import BottomNav from '@/components/BottomNav';

export default function CanvassingLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
      <BottomNav />
    </div>
  );
}
