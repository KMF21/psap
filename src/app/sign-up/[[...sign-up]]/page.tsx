import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg px-6 py-12">
      <SignUp
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
