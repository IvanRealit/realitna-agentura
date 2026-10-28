import Image from "next/image";
export function Avatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <div className="agent-avatar">
      {src ? (
        <Image src={src} alt={name} width={56} height={56} />
      ) : (
        name
          .split(" ")
          .map((v) => v[0])
          .join("")
          .slice(0, 2)
      )}
    </div>
  );
}
