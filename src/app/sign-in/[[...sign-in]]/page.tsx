import { Logo } from "@/components/ui/Logo";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-bg px-6 py-12">
      <Logo size={88} />
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#0F6E64",
            colorBackground: "#FFFFFF",
            borderRadius: "0.5rem",
            fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          },
        }}
      />
    </div>
  );
}
