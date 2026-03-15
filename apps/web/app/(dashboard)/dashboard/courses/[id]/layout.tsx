/** Editor a schermo intero — override del layout dashboard */
export default function CourseEditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 bg-white z-30 overflow-hidden">{children}</div>;
}
