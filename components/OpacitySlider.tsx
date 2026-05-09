import React, { useRef } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";

interface OpacitySliderProps {
  value: number;
  onChange: (v: number) => void;
  width?: number;
  trackColor?: string;
  thumbColor?: string;
}

export function OpacitySlider({
  value,
  onChange,
  width = 220,
  trackColor = "rgba(255,255,255,0.3)",
  thumbColor = "#d4956a",
}: OpacitySliderProps) {
  const startX = useRef(0);
  const startValue = useRef(value);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        startX.current = gs.x0;
        startValue.current = value;
      },
      onPanResponderMove: (_, gs) => {
        const delta = gs.moveX - startX.current;
        const newVal = Math.max(0, Math.min(1, startValue.current + delta / width));
        onChange(Math.round(newVal * 100) / 100);
      },
    }),
  ).current;

  const thumbLeft = value * width - 10;

  return (
    <View
      style={[styles.track, { width, backgroundColor: trackColor }]}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.fill,
          {
            width: value * width,
            backgroundColor: thumbColor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.thumb,
          { left: Math.max(0, Math.min(width - 20, thumbLeft)), backgroundColor: thumbColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    position: "relative",
    justifyContent: "center",
  },
  fill: {
    height: 4,
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    top: -8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
