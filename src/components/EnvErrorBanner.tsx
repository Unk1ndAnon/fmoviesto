import { AlertTriangle } from "lucide-react";

interface EnvCheckResult {
  name: string;
  value: string | undefined;
  required: boolean;
  isSet: boolean;
}

const checkEnvVariables = (): EnvCheckResult[] => {
  const checks: EnvCheckResult[] = [
    {
      name: "VITE_SUPABASE_URL",
      value: import.meta.env.VITE_SUPABASE_URL,
      required: true,
      isSet: !!import.meta.env.VITE_SUPABASE_URL,
    },
    {
      name: "VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY",
      value: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      required: true,
      isSet: !!(import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    },
  ];

  return checks;
};

export const validateEnvironment = (): { isValid: boolean; missingVars: string[] } => {
  const checks = checkEnvVariables();
  const missingVars = checks
    .filter((check) => check.required && !check.isSet)
    .map((check) => check.name);

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

export function EnvErrorBanner() {
  const { isValid, missingVars } = validateEnvironment();

  // Don't show anything if all vars are set
  if (isValid) return null;

  // Only show in production (Vercel) - on Lovable preview, env vars are auto-configured
  const isLovablePreview = typeof window !== 'undefined' && 
    (window.location.hostname.includes('lovableproject.com') || 
     window.location.hostname.includes('localhost'));

  if (isLovablePreview) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="mx-4 max-w-lg rounded-xl border border-red-500/30 bg-background p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-red-500/20 p-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Configuration Error
          </h2>
          
          <p className="mb-4 text-muted-foreground leading-relaxed">
            The following environment variables are missing or not configured:
          </p>
          
          <div className="mb-6 w-full rounded-lg bg-red-500/10 p-4">
            <ul className="space-y-2 text-left">
              {missingVars.map((varName) => (
                <li key={varName} className="flex items-center gap-2 text-red-400 font-mono text-sm">
                  <span className="text-red-500">✗</span>
                  {varName}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>For Vercel deployment:</strong>
            </p>
            <p>
              Go to Vercel Dashboard → Settings → Environment Variables and add the missing variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
