import { Home, Clock, User } from "lucide-react";

type Tab = "home" | "history" | "profile";

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
}

export default function BottomTabs({ active, onChange }: Props) {
  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "history", label: "History", icon: Clock },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border safe-bottom z-40">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-accent" : "text-text-secondary"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? "text-accent" : ""}
              />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
