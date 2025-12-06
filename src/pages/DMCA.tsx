import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { AlertTriangle } from "lucide-react";

export default function DMCA() {
  return (
    <>
      <SEOHead
        title="DMCA Policy"
        description="DMCA Policy for Fmovies - Information about copyright claims and takedown procedures."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-4xl font-bold text-foreground mb-8">DMCA Policy</h1>
            
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 mb-8 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Fmovies does not host any content on its servers. All media is provided by 
                non-affiliated third parties. For copyright concerns regarding hosted content, 
                please contact the respective hosting providers directly.
              </p>
            </div>

            <div className="prose prose-invert max-w-none space-y-6">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">What is DMCA?</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Digital Millennium Copyright Act (DMCA) is a United States copyright law that 
                  implements two 1996 treaties of the World Intellectual Property Organization (WIPO). 
                  It criminalizes production and dissemination of technology, devices, or services 
                  intended to circumvent measures that control access to copyrighted works.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Copyright Infringement Claims</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you believe that your copyrighted work has been copied in a way that constitutes 
                  copyright infringement and is accessible on this site, please note that we do not 
                  host any video content on our servers. All content is embedded from third-party 
                  streaming services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">How to File a DMCA Notice</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To file a proper DMCA takedown notice, please provide the following information:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Identification of the copyrighted work claimed to have been infringed</li>
                  <li>Identification of the material that is claimed to be infringing</li>
                  <li>Your contact information (address, phone number, email)</li>
                  <li>A statement that you have a good faith belief that use of the material is not authorized</li>
                  <li>A statement that the information in the notification is accurate</li>
                  <li>Your physical or electronic signature</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Response Time</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We take copyright infringement seriously and will respond to properly submitted 
                  DMCA notices within 24-48 business hours. Please note that we can only remove 
                  links and references from our platform - the actual content must be removed by 
                  the hosting provider.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Counter-Notification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you believe that your content was removed or disabled by mistake or 
                  misidentification, you may file a counter-notification with the required 
                  information as specified by the DMCA.
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
