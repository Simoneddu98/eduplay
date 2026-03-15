/**
 * The course editor uses a full-screen layout WITHOUT the dashboard sidebar.
 * This is intentional — authoring tools need maximum canvas space.
 * We override the parent (dashboard) layout by wrapping with a plain div.
 */
export default function CourseEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-white z-30 overflow-hidden">
      {children}
    </div>
  );
}
