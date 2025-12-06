import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";

export default function Privacy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy"
        description="Privacy Policy for Fmovies - Learn how we collect, use, and protect your information."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
            
            <div className="prose prose-invert max-w-none space-y-6">
              <p className="text-muted-foreground text-lg">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We collect information that you provide directly to us, such as when you use our 
                  services, contact us, or participate in any interactive features. This may include:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Usage data and browsing preferences</li>
                  <li>Device information (browser type, operating system)</li>
                  <li>IP address and approximate location</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Personalize your experience and content recommendations</li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                  <li>Detect, investigate, and prevent fraudulent or unauthorized activities</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">3. Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to collect information about your browsing 
                  activities. You can instruct your browser to refuse all cookies or to indicate when 
                  a cookie is being sent.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">4. Third-Party Services</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our service may contain links to third-party websites or services that are not 
                  operated by us. We have no control over and assume no responsibility for the content, 
                  privacy policies, or practices of any third-party sites or services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">5. Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational security measures to protect 
                  your personal information. However, no method of transmission over the Internet is 
                  100% secure.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">6. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us through 
                  our website.
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
