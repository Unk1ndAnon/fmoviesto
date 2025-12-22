import { useState } from "react";
import { Link } from "react-router-dom";
import { useTags, getTagTypeColor } from "@/hooks/useTags";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, Film, Palette, MapPin, Sparkles, Users } from "lucide-react";

const TAG_TYPES = [
  { value: "all", label: "All Tags", icon: Tag },
  { value: "genre", label: "Genres", icon: Film },
  { value: "mood", label: "Moods", icon: Palette },
  { value: "theme", label: "Themes", icon: Sparkles },
  { value: "setting", label: "Settings", icon: MapPin },
  { value: "audience", label: "Audience", icon: Users },
];

export default function TagsIndex() {
  const [selectedType, setSelectedType] = useState("all");
  
  const { data: tags, isLoading } = useTags({
    type: selectedType === "all" ? undefined : selectedType,
    minMovieCount: 1,
  });

  // Group tags by type for the "all" view
  const groupedTags = tags?.reduce((acc, tag) => {
    const type = tag.tag_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(tag);
    return acc;
  }, {} as Record<string, typeof tags>);

  return (
    <>
      <SEOHead
        title="Browse Tags - Discover Movies by Mood, Theme & Style"
        description="Explore our AI-powered movie tags. Find films by mood, theme, setting, and style. Discover movies that match exactly what you're looking for."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <header className="mb-8 text-center">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
              <Tag className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Browse by Tags
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover movies and TV shows through AI-powered tags. Find content that matches your mood, 
              explore specific themes, or browse by visual style.
            </p>
          </header>

          {/* Tag Type Tabs */}
          <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-8">
            <TabsList className="flex flex-wrap justify-center gap-2 h-auto bg-transparent">
              {TAG_TYPES.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : selectedType === "all" && groupedTags ? (
            // Show grouped view
            <div className="space-y-10">
              {Object.entries(groupedTags).map(([type, typeTags]) => (
                <section key={type}>
                  <h2 className="text-xl font-semibold mb-4 capitalize flex items-center gap-2">
                    {TAG_TYPES.find(t => t.value === type)?.icon && (
                      <span className="text-muted-foreground">
                        {(() => {
                          const Icon = TAG_TYPES.find(t => t.value === type)?.icon || Tag;
                          return <Icon className="w-5 h-5" />;
                        })()}
                      </span>
                    )}
                    {type}s
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {typeTags?.map((tag) => (
                      <Link key={tag.id} to={`/tag/${tag.slug}`}>
                        <Badge
                          variant="outline"
                          className={`${getTagTypeColor(tag.tag_type)} text-sm py-2 px-3 cursor-pointer hover:scale-105 transition-transform`}
                        >
                          {tag.name}
                          <span className="ml-2 opacity-60">({tag.movie_count})</span>
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : tags && tags.length > 0 ? (
            // Show flat grid for filtered view
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <Link key={tag.id} to={`/tag/${tag.slug}`}>
                  <Badge
                    variant="outline"
                    className={`${getTagTypeColor(tag.tag_type)} text-sm py-2 px-4 cursor-pointer hover:scale-105 transition-transform`}
                  >
                    {tag.name}
                    <span className="ml-2 opacity-60">({tag.movie_count})</span>
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tags found in this category yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Tags are generated automatically as content is processed.
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
