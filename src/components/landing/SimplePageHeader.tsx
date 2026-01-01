interface SimplePageHeaderProps {
  title: string;
  description: string;
}

export default function SimplePageHeader({
  title,
  description,
}: SimplePageHeaderProps) {
  return (
    <div className="text-center py-12 animate-in fade-in duration-500">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
        {title}
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        {description}
      </p>
    </div>
  );
}
