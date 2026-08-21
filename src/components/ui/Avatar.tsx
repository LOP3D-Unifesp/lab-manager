import { User } from "lucide-react";

type AvatarProps = {
  avatarUrl?: string | null;
  name?: string;
  className?: string;
};

function getInitials(name?: string) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (words.length === 0) {
    return "";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ avatarUrl, name, className = "h-10 w-10" }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ? `Foto de ${name}` : "Foto de perfil"}
        className={`inline-flex shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  const initials = getInitials(name);

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark ${className}`}
    >
      {initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <User className="h-4 w-4" aria-hidden="true" />
      )}
    </div>
  );
}
