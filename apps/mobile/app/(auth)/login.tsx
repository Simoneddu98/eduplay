import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "eduplay://auth/callback",
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (error: any) {
      Alert.alert("Errore", error.message ?? "Accesso fallito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>EP</Text>
          </View>
          <Text style={styles.logoText}>EduPlay</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Studia. Gioca. Cresci.</Text>
          <Text style={styles.heroSubtitle}>
            La piattaforma gamificata per imparare Digital Marketing, AI e Sales
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {[
            { emoji: "⚡", text: "Guadagna XP completando lezioni" },
            { emoji: "🏆", text: "Scala la classifica globale" },
            { emoji: "🤖", text: "AI Tutor disponibile 24/7" },
            { emoji: "🎯", text: "Missioni giornaliere e settimanali" },
          ].map((feature) => (
            <View key={feature.text} style={styles.featureItem}>
              <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleBtnText}>
              {loading ? "Accesso in corso..." : "Continua con Google"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Registrandoti accetti i nostri Termini di Servizio e la Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E3A5F" },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoIconText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  hero: { marginBottom: 32 },
  heroTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 42,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 24,
  },
  features: { marginBottom: 40, gap: 12 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  featureText: { fontSize: 14, color: "rgba(255,255,255,0.8)", flex: 1 },
  ctas: { gap: 16 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 12,
  },
  googleBtnDisabled: { opacity: 0.6 },
  googleG: {
    fontSize: 18,
    fontWeight: "900",
    color: "#4285F4",
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  disclaimer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    lineHeight: 18,
  },
});
