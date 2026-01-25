import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { X } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RadialDialProps {
  value: number;
  maxValue: number;
  onValueChange: (value: number) => void;
  color: string;
  size?: number;
}

function RadialDial({
  value,
  maxValue,
  onValueChange,
  color,
  size = 220,
}: RadialDialProps) {
  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  const progress = value / maxValue;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e293b"
          strokeWidth={16}
          fill="transparent"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={16}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Label */}
      <View
        className="absolute inset-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Text className="text-4xl font-bold text-white">
          {Math.round((value / 100) * 150)}g
        </Text>
        <Text className="text-slate-400 text-sm">{value}%</Text>
      </View>
    </View>
  );
}

export default function PlateBuilderScreen() {
  const router = useRouter();
  const [fillPercentage, setFillPercentage] = useState(50);

  const isOverBudget = fillPercentage > 100;
  const dialColor = isOverBudget ? '#f59e0b' : '#3b82f6';

  const quickFillOptions = [25, 50, 75, 100, 125, 150];

  const handleConfirm = () => {
    // TODO: Add to plate via API/state
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-800">
        <Pressable onPress={() => router.back()} className="p-2">
          <X color="#94a3b8" size={24} />
        </Pressable>
        <Text className="text-white font-semibold text-lg">Add to Plate</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        {/* Food Info */}
        <View className="items-center mb-8">
          <Text className="text-4xl mb-2">🍗</Text>
          <Text className="text-xl font-semibold text-white">Chicken Breast</Text>
          <Text className="text-slate-400">Adding to Lunch</Text>
        </View>

        {/* Radial Dial */}
        <RadialDial
          value={fillPercentage}
          maxValue={150}
          onValueChange={setFillPercentage}
          color={dialColor}
        />

        {/* Quick Fill Buttons */}
        <View className="flex-row flex-wrap gap-2 mt-8 justify-center">
          {quickFillOptions.map((pct) => (
            <Pressable
              key={pct}
              onPress={() => setFillPercentage(pct)}
              className={`px-5 py-3 rounded-xl ${
                fillPercentage === pct ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <Text
                className={`font-medium ${
                  fillPercentage === pct ? 'text-white' : 'text-slate-400'
                }`}
              >
                {pct}%
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Over budget warning */}
        {isOverBudget && (
          <View className="mt-4 bg-amber-500/20 px-4 py-2 rounded-lg">
            <Text className="text-amber-400 text-sm">
              Exceeds macro budget for this meal
            </Text>
          </View>
        )}

        {/* Macro Preview */}
        <View className="flex-row justify-around w-full mt-8 py-4 border-t border-slate-800">
          <View className="items-center">
            <Text className="text-purple-500 text-xl font-bold">
              {Math.round(31 * (fillPercentage / 100))}g
            </Text>
            <Text className="text-slate-400 text-xs">Protein</Text>
          </View>
          <View className="items-center">
            <Text className="text-amber-500 text-xl font-bold">
              {Math.round(0 * (fillPercentage / 100))}g
            </Text>
            <Text className="text-slate-400 text-xs">Carbs</Text>
          </View>
          <View className="items-center">
            <Text className="text-rose-500 text-xl font-bold">
              {Math.round(3.6 * (fillPercentage / 100))}g
            </Text>
            <Text className="text-slate-400 text-xs">Fat</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-3 px-6 pb-8">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 py-4 bg-slate-800 rounded-xl"
        >
          <Text className="text-slate-300 text-center font-medium">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleConfirm}
          className={`flex-1 py-4 rounded-xl ${
            isOverBudget ? 'bg-amber-600' : 'bg-blue-600'
          }`}
        >
          <Text className="text-white text-center font-medium">
            {isOverBudget ? 'Add Anyway' : 'Add to Plate'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
