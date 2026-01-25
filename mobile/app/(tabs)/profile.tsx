import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-6">
          <Text className="text-2xl font-bold text-white">Profile</Text>
          <Text className="text-slate-400 text-sm">Your settings</Text>
        </View>

        {/* Biometrics Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-white text-lg font-semibold mb-4">
            Biometrics
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between py-2 border-b border-slate-800">
              <Text className="text-slate-400">Height</Text>
              <Text className="text-white font-medium">175 cm</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-slate-800">
              <Text className="text-slate-400">Current Weight</Text>
              <Text className="text-white font-medium">80.5 kg</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-slate-800">
              <Text className="text-slate-400">Target Weight</Text>
              <Text className="text-white font-medium">75.0 kg</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-slate-400">Body Fat</Text>
              <Text className="text-white font-medium">18%</Text>
            </View>
          </View>
        </View>

        {/* Goals Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-white text-lg font-semibold mb-4">
            Goals
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between py-2 border-b border-slate-800">
              <Text className="text-slate-400">Objective</Text>
              <Text className="text-white font-medium">Lose Weight</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-slate-400">Weekly Target</Text>
              <Text className="text-white font-medium">-0.5 kg/week</Text>
            </View>
          </View>
        </View>

        {/* Macro Distribution */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-white text-lg font-semibold mb-4">
            Macro Distribution
          </Text>

          <View className="flex-row justify-around">
            <View className="items-center">
              <View className="w-16 h-16 rounded-full border-4 border-purple-500 items-center justify-center mb-2">
                <Text className="text-white font-bold">30%</Text>
              </View>
              <Text className="text-slate-400 text-xs">Protein</Text>
            </View>
            <View className="items-center">
              <View className="w-16 h-16 rounded-full border-4 border-amber-500 items-center justify-center mb-2">
                <Text className="text-white font-bold">45%</Text>
              </View>
              <Text className="text-slate-400 text-xs">Carbs</Text>
            </View>
            <View className="items-center">
              <View className="w-16 h-16 rounded-full border-4 border-rose-500 items-center justify-center mb-2">
                <Text className="text-white font-bold">25%</Text>
              </View>
              <Text className="text-slate-400 text-xs">Fat</Text>
            </View>
          </View>
        </View>

        {/* Log Workout Button */}
        <Pressable
          onPress={() => router.push('/log-workout')}
          className="bg-blue-600 py-4 rounded-xl mb-4"
        >
          <Text className="text-white text-center font-semibold">
            Log Today's Workout
          </Text>
        </Pressable>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
