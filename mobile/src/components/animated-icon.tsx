import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 650;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 1,
      transform: [{ scale: 1.04 }],
      easing: Easing.out(Easing.cubic),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1.08 }],
      easing: Easing.out(Easing.cubic),
    },
  });

  const image = (
    <View style={styles.logoWrap}>
      <Image style={styles.image} source={require('@/assets/images/kitsphere-logo.png')} />
      <Text style={styles.brandText}>KitSphere</Text>
    </View>
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}
    >
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}
    >
      {image}
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
    opacity: 0.2,
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.out(Easing.cubic),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.35 }],
    opacity: 0,
  },
  35: {
    transform: [{ scale: 1.2 }],
    opacity: 0.3,
    easing: Easing.out(Easing.cubic),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
    opacity: 0,
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
    opacity: 0.75,
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/kitsphere-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
    opacity: 0.8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  background: {
    borderRadius: 40,
    backgroundColor: '#2D88FF',
    width: 128,
    height: 128,
    position: 'absolute',
    opacity: 0.9,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#061722',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
