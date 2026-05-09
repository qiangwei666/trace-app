import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSketch, type SketchEntry } from "@/context/SketchContext";

const { width: SCREEN_W } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_W - 48) / 2;

async function imageUriToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries, addEntry, removeEntry, setCurrentEntry } = useSketch();

  const [processing, setProcessing] = useState(false);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [sketchPreview, setSketchPreview] = useState<string | null>(null);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please grant photo library access to pick a reference image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedUri(result.assets[0].uri);
      setSketchPreview(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera permission required",
        "Please grant camera access to take a reference photo.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedUri(result.assets[0].uri);
      setSketchPreview(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const convertToSketch = async () => {
    if (!selectedUri) return;
    setProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const base64 = await imageUriToBase64(selectedUri);
      if (!base64) throw new Error("Failed to read image");

      const apiBase = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const response = await fetch(`${apiBase}/api/sketch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error ?? "Server error");
      }

      const data = (await response.json()) as { sketchBase64: string };
      const id =
        Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const entry: SketchEntry = {
        id,
        originalUri: selectedUri,
        sketchBase64: data.sketchBase64,
        createdAt: Date.now(),
      };

      setSketchPreview(data.sketchBase64);
      await addEntry(entry);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error", (e as Error).message ?? "Could not process image");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessing(false);
    }
  };

  const retakeOrReplace = () => {
    Alert.alert("Replace image", "Choose a new source", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openOverlay = (entry: SketchEntry) => {
    setCurrentEntry(entry);
    router.push("/overlay");
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Remove sketch", "Delete this sketch from your library?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          removeEntry(id);
        },
      },
    ]);
  };

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Trace</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sketch reference overlay
        </Text>
      </View>

      {/* Source picker / preview card */}
      <View
        style={[
          styles.importCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {selectedUri ? (
          <>
            <View style={styles.previewRow}>
              {/* Original photo */}
              <Pressable
                onPress={retakeOrReplace}
                style={styles.previewThumb}
              >
                <Image
                  source={{ uri: selectedUri }}
                  style={styles.previewImg}
                  resizeMode="cover"
                />
                <View style={styles.previewBadge}>
                  <Feather name="refresh-cw" size={14} color="#fff" />
                  <Text style={styles.previewBadgeText}>Replace</Text>
                </View>
              </Pressable>

              {/* Sketch result or placeholder */}
              {sketchPreview ? (
                <View style={styles.previewThumb}>
                  <Image
                    source={{ uri: `data:image/png;base64,${sketchPreview}` }}
                    style={[styles.previewImg, { backgroundColor: "#fff" }]}
                    resizeMode="contain"
                  />
                  <View style={styles.previewBadge}>
                    <MaterialCommunityIcons
                      name="pencil"
                      size={14}
                      color="#fff"
                    />
                    <Text style={styles.previewBadgeText}>Sketch</Text>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.previewThumb,
                    styles.previewPlaceholder,
                    { borderColor: colors.border },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={30}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.previewPlaceholderText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Sketch preview
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.convertBtn,
                {
                  backgroundColor: processing ? colors.muted : colors.primary,
                  opacity: processing ? 0.7 : 1,
                },
              ]}
              onPress={convertToSketch}
              disabled={processing}
              activeOpacity={0.8}
            >
              {processing ? (
                <ActivityIndicator
                  color={colors.primaryForeground}
                  size="small"
                />
              ) : (
                <MaterialCommunityIcons
                  name="pencil-ruler"
                  size={20}
                  color={colors.primaryForeground}
                />
              )}
              <Text
                style={[
                  styles.convertBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                {processing ? "Converting…" : "Convert to Sketch"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.sourceRow}>
            {/* Camera button */}
            <TouchableOpacity
              style={[
                styles.sourceBtn,
                {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={takePhoto}
              activeOpacity={0.8}
            >
              <Feather name="camera" size={26} color={colors.primaryForeground} />
              <Text
                style={[styles.sourceBtnLabel, { color: colors.primaryForeground }]}
              >
                Camera
              </Text>
            </TouchableOpacity>

            <View style={[styles.sourceDivider, { backgroundColor: colors.border }]} />

            {/* Gallery button */}
            <TouchableOpacity
              style={[
                styles.sourceBtn,
                {
                  backgroundColor: colors.secondary,
                },
              ]}
              onPress={pickFromGallery}
              activeOpacity={0.8}
            >
              <Feather
                name="image"
                size={26}
                color={colors.secondaryForeground}
              />
              <Text
                style={[
                  styles.sourceBtnLabel,
                  { color: colors.secondaryForeground },
                ]}
              >
                Gallery
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Saved sketches gallery */}
      {entries.length > 0 && (
        <>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.mutedForeground, marginTop: 28 },
            ]}
          >
            SAVED SKETCHES
          </Text>
          <View style={styles.grid}>
            {entries.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => openOverlay(item)}
                onLongPress={() => confirmDelete(item.id)}
                style={({ pressed }) => [
                  styles.thumbCard,
                  {
                    backgroundColor: "#fff",
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Image
                  source={{
                    uri: `data:image/png;base64,${item.sketchBase64}`,
                  }}
                  style={styles.thumbImg}
                  resizeMode="contain"
                />
                <View
                  style={[styles.thumbFooter, { backgroundColor: colors.card }]}
                >
                  <Feather name="layers" size={14} color={colors.primary} />
                  <Text
                    style={[
                      styles.thumbLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Tap to overlay
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {entries.length === 0 && !selectedUri && (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconRing,
              { borderColor: colors.border },
            ]}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={36}
              color={colors.mutedForeground}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
            No sketches yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.border }]}>
            Take a photo or pick from your gallery{"\n"}to create a tracing overlay
          </Text>
        </View>
      )}

      <View
        style={{
          height:
            insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  importCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  sourceRow: {
    flexDirection: "row",
    height: 130,
  },
  sourceBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  sourceBtnLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  sourceDivider: {
    width: 1,
  },
  previewRow: {
    flexDirection: "row",
    gap: 0,
  },
  previewThumb: {
    flex: 1,
    height: 150,
    position: "relative",
    overflow: "hidden",
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  previewBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  previewBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  previewPlaceholder: {
    borderLeftWidth: 1,
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  previewPlaceholderText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  convertBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    margin: 12,
    marginTop: 0,
    borderRadius: 12,
  },
  convertBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  thumbCard: {
    width: THUMB_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  thumbImg: {
    width: "100%",
    height: THUMB_SIZE,
  },
  thumbFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  thumbLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 48,
    gap: 10,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
