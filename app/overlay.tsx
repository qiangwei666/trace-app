import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSketch } from "@/context/SketchContext";
import { OpacitySlider } from "@/components/OpacitySlider";

const { width: W, height: H } = Dimensions.get("window");

export default function OverlayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentEntry } = useSketch();

  const [opacity, setOpacity] = useState(0.75);
  const [scale, setScale] = useState(1);
  const [locked, setLocked] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastPan = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !locked,
      onMoveShouldSetPanResponder: () => !locked,
      onPanResponderGrant: () => {
        pan.setOffset(lastPan.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gs) => {
        pan.flattenOffset();
        lastPan.current = {
          x: lastPan.current.x + gs.dx,
          y: lastPan.current.y + gs.dy,
        };
      },
    }),
  ).current;

  const imgW = W * scale;
  const imgH = (H * 0.6) * scale;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad =
    Platform.OS === "web"
      ? Math.max(insets.bottom, 34)
      : insets.bottom;

  if (!currentEntry) {
    return (
      <View style={[styles.root, { backgroundColor: "#000" }]}>
        <Text style={{ color: "#fff", textAlign: "center", marginTop: 200 }}>
          No sketch selected
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#000" }]}>
      <Animated.View
        style={[
          styles.imageWrapper,
          {
            width: imgW,
            height: imgH,
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Image
          source={{ uri: `data:image/png;base64,${currentEntry.sketchBase64}` }}
          style={{ width: imgW, height: imgH }}
          resizeMode="contain"
        />
      </Animated.View>

      {controlsVisible && (
        <View
          style={[
            styles.controls,
            {
              paddingTop: topPad,
              paddingBottom: bottomPad + 8,
              backgroundColor: "rgba(0,0,0,0.0)",
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.topRow} pointerEvents="auto">
            <Pressable
              onPress={() => router.back()}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Feather name="arrow-left" size={22} color="#fff" />
            </Pressable>

            <View style={styles.topRowRight}>
              <Pressable
                onPress={() => {
                  setLocked((v) => !v);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.iconBtn,
                  locked && { backgroundColor: "rgba(212,149,106,0.25)" },
                ]}
                hitSlop={8}
              >
                <Feather
                  name={locked ? "lock" : "unlock"}
                  size={20}
                  color={locked ? colors.primary : "#fff"}
                />
              </Pressable>

              <Pressable
                onPress={() => setControlsVisible(false)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Feather name="eye-off" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomPanel} pointerEvents="auto">
            <View style={styles.panelRow}>
              <MaterialCommunityIcons
                name="opacity"
                size={16}
                color="rgba(255,255,255,0.6)"
              />
              <OpacitySlider
                value={opacity}
                onChange={setOpacity}
                width={180}
                trackColor="rgba(255,255,255,0.2)"
                thumbColor={colors.primary}
              />
              <Text style={styles.valueLabel}>
                {Math.round(opacity * 100)}%
              </Text>
            </View>

            <View style={styles.panelRow}>
              <Feather name="maximize-2" size={16} color="rgba(255,255,255,0.6)" />
              <View style={styles.scaleButtons}>
                <Pressable
                  onPress={() =>
                    setScale((s) => Math.max(0.2, parseFloat((s - 0.1).toFixed(1))))
                  }
                  style={styles.scaleBtn}
                  hitSlop={6}
                >
                  <Feather name="minus" size={16} color="#fff" />
                </Pressable>
                <Text style={styles.valueLabel}>{Math.round(scale * 100)}%</Text>
                <Pressable
                  onPress={() =>
                    setScale((s) => Math.min(3, parseFloat((s + 0.1).toFixed(1))))
                  }
                  style={styles.scaleBtn}
                  hitSlop={6}
                >
                  <Feather name="plus" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            <Text style={styles.hint}>
              {locked ? "Locked — tap lock to move" : "Drag to reposition"}
            </Text>
          </View>
        </View>
      )}

      {!controlsVisible && (
        <Pressable
          style={[
            styles.showControlsBtn,
            {
              bottom: bottomPad + 20,
              right: 20,
            },
          ]}
          onPress={() => setControlsVisible(true)}
        >
          <Feather name="eye" size={18} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapper: {
    position: "absolute",
  },
  backBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    padding: 8,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  topRowRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  panelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  valueLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    minWidth: 36,
    textAlign: "right",
  },
  scaleButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    justifyContent: "center",
  },
  scaleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  showControlsBtn: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
