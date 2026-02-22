import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { getLevelFromXP, getXPProgress } from "@eduplay/utils";
import type { Profile, EnrollmentWithCourse } from "@eduplay/types";

export default function DashboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: prof }, { data: enr }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("enrollments")
        .select("*, course:courses(*)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false })
        .limit(3),
    ]);

    if (prof) setProfile(prof as Profile);
    if (enr) setEnrollments(enr as unknown as EnrollmentWithCourse[]);
  }

  useEffect(() => { fetchData(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const levelInfo = getLevelFromXP(profile?.xp_total ?? 0);
  const xpProgress = getXPProgress(profile?.xp_total ?? 0);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Campione";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Ciao, {firstName}! 👋</Text>
          <Text style={styles.subGreeting}>Continua la tua avventura</Text>
        </View>

        {/* XP Card */}
        <View style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <Text style={styles.levelText}>Lv.{levelInfo.level} — {levelInfo.name}</Text>
            <Text style={styles.xpAmount}>⚡ {(profile?.xp_total ?? 0).toLocaleString()} XP</Text>
          </View>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${xpProgress}%` as any }]} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>🔥 {profile?.streak_current ?? 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>🪙 {(profile?.edu_coins ?? 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>EduCoins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>📚 {enrollments.length}</Text>
              <Text style={styles.statLabel}>Corsi</Text>
            </View>
          </View>
        </View>

        {/* Continue Learning */}
        {enrollments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Continua a studiare</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/courses")}>
                <Text style={styles.sectionLink}>Vedi tutti</Text>
              </TouchableOpacity>
            </View>
            {enrollments.map((enrollment) => (
              <TouchableOpacity
                key={enrollment.id}
                style={styles.courseCard}
                onPress={() => router.push(`/courses/${enrollment.course_id}` as any)}
              >
                <View style={styles.courseCardLeft}>
                  <View style={styles.courseIcon}>
                    <Text style={styles.courseIconText}>📖</Text>
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseTitle} numberOfLines={1}>
                      {(enrollment as any).course?.title ?? "Corso"}
                    </Text>
                    <Text style={styles.courseProgress}>{enrollment.progress_pct}% completato</Text>
                    <View style={styles.miniProgress}>
                      <View
                        style={[styles.miniProgressFill, { width: `${enrollment.progress_pct}%` as any }]}
                      />
                    </View>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty state */}
        {enrollments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎮</Text>
            <Text style={styles.emptyTitle}>Inizia il tuo percorso!</Text>
            <Text style={styles.emptySubtitle}>Iscriviti al tuo primo corso e inizia a guadagnare XP</Text>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => router.push("/(tabs)/courses")}
            >
              <Text style={styles.ctaText}>Esplora i corsi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni rapide</Text>
          <View style={styles.quickActions}>
            {[
              { emoji: "🏆", label: "Classifica", route: "/(tabs)/leaderboard" },
              { emoji: "🎯", label: "Missioni", route: "/missions" },
              { emoji: "🤖", label: "AI Tutor", route: "/(tabs)/ai-tutor" },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickAction}
                onPress={() => router.push(action.route as any)}
              >
                <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subGreeting: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  xpCard: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#1E3A5F",
  },
  xpHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  levelText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  xpAmount: { color: "#FCD34D", fontSize: 14, fontWeight: "700" },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FCD34D",
    borderRadius: 4,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  statLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionLink: { fontSize: 13, color: "#2E86AB", fontWeight: "600" },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  courseCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  courseIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  courseIconText: { fontSize: 20 },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 2 },
  courseProgress: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  miniProgress: {
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    backgroundColor: "#1E3A5F",
    borderRadius: 2,
  },
  chevron: { fontSize: 24, color: "#9CA3AF", marginLeft: 8 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 24,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 20 },
  cta: {
    backgroundColor: "#1E3A5F",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  quickActions: { flexDirection: "row", gap: 12 },
  quickAction: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionEmoji: { fontSize: 28, marginBottom: 6 },
  quickActionLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
});
