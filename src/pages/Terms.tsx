import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";

export default function Terms() {
  return (
    <>
      <SEOHead
        title="Terms of Service"
        description="Terms of Service for Fmovies - Rules and guidelines for using our platform."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
            
            <div className="prose prose-invert max-w-none space-y-6">
              <p className="text-muted-foreground text-lg">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing and using Fmovies, you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by these terms, 
                  please do not use this service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Fmovies provides a platform that allows users to discover and access streaming 
                  content from various third-party sources. We do not host, upload, or distribute 
                  any video content on our servers.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">3. User Responsibilities</h2>
                <p className="text-muted-foreground leading-relaxed">
                  As a user of this service, you agree to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Use the service only for lawful purposes</li>
                  <li>Not attempt to circumvent any security measures</li>
                  <li>Not engage in any activity that disrupts the service</li>
                  <li>Comply with all applicable local, state, and federal laws</li>
                  <li>Be responsible for your own viewing choices</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">4. Content Disclaimer</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All content accessible through Fmovies is provided by third-party services. 
                  We do not control, endorse, or assume responsibility for any content from 
                  external sources. Users access such content at their own risk.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">5. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Fmovies name, logo, and website design are our intellectual property. 
                  All trademarks, service marks, and trade names are proprietary. The content 
                  displayed on our platform belongs to their respective copyright holders.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">6. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Fmovies shall not be liable for any direct, indirect, incidental, special, 
                  consequential, or exemplary damages resulting from your use of the service 
                  or any content accessed through our platform.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">7. Modifications to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms at any time. Changes will be effective 
                  immediately upon posting. Your continued use of the service following any changes 
                  constitutes your acceptance of the revised terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">8. Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may terminate or suspend access to our service immediately, without prior 
                  notice or liability, for any reason whatsoever, including without limitation 
                  if you breach the Terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">9. Contact</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us through our website.
                </p>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
