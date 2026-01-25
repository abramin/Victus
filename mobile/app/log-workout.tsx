import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type TrainingType =
  | 'rest'
  | 'walking'
  | 'run'
  | 'cycle'
  | 'strength'
  | 'hiit'
  | 'mobility';

interface Session {
  id: string;
  type: TrainingType;
  durationMin: number;
  rpe: number;
  notes: string;
}

const TRAINING_OPTIONS: { value: TrainingType; label: string; emoji: string }[] = [
  { value: 'rest', label: 'Rest', emoji: '😴' },
  { value: 'walking', label: 'Walking', emoji: '🚶' },
  { value: 'run', label: 'Run', emoji: '🏃' },
  { value: 'cycle', label: 'Cycling', emoji: '🚴' },
  { value: 'strength', label: 'Strength', emoji: '🏋️' },
  { value: 'hiit', label: 'HIIT', emoji: '⚡' },
  { value: 'mobility', label: 'Mobility', emoji: '🧘' },
];

const RPE_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#22c55e',
  3: '#84cc16',
  4: '#84cc16',
  5: '#eab308',
  6: '#eab308',
  7: '#f97316',
  8: '#f97316',
  9: '#ef4444',
  10: '#ef4444',
};

export default function LogWorkoutScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([
    { id: '1', type: 'strength', durationMin: 45, rpe: 7, notes: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const addSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      type: 'rest',
      durationMin: 30,
      rpe: 5,
      notes: '',
    };
    setSessions([...sessions, newSession]);
  };

  const removeSession = (id: string) => {
    if (sessions.length > 1) {
      setSessions(sessions.filter((s) => s.id !== id));
    }
  };

  const updateSession = (id: string, updates: Partial<Session>) => {
    setSessions(
      sessions.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: Save to API
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    router.back();
  };

  const calculateLoad = (duration: number, rpe: number) => {
    return Math.round(duration * (rpe / 10) * 10);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-800">
        <Pressable onPress={() => router.back()} className="p-2">
          <X color="#94a3b8" size={24} />
        </Pressable>
        <Text className="text-white font-semibold text-lg">Log Workout</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-blue-600 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-medium">
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {sessions.map((session, index) => (
          <Animated.View
            key={session.id}
            entering={FadeInDown.delay(index * 100)}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4"
          >
            {/* Session Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-semibold">
                Session {index + 1}
              </Text>
              {sessions.length > 1 && (
                <Pressable
                  onPress={() => removeSession(session.id)}
                  className="p-2"
                >
                  <Trash2 color="#ef4444" size={18} />
                </Pressable>
              )}
            </View>

            {/* Training Type */}
            <Text className="text-slate-400 text-xs uppercase mb-2">
              Activity
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row gap-2">
                {TRAINING_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      updateSession(session.id, { type: option.value })
                    }
                    className={`px-4 py-2 rounded-lg ${
                      session.type === option.value
                        ? 'bg-blue-600'
                        : 'bg-slate-800'
                    }`}
                  >
                    <Text className="text-center text-lg">{option.emoji}</Text>
                    <Text
                      className={`text-xs ${
                        session.type === option.value
                          ? 'text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Duration */}
            <Text className="text-slate-400 text-xs uppercase mb-2">
              Duration (min)
            </Text>
            <View className="flex-row items-center gap-2 mb-4">
              {[15, 30, 45, 60, 90].map((mins) => (
                <Pressable
                  key={mins}
                  onPress={() => updateSession(session.id, { durationMin: mins })}
                  className={`flex-1 py-2 rounded-lg ${
                    session.durationMin === mins
                      ? 'bg-blue-600'
                      : 'bg-slate-800'
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      session.durationMin === mins
                        ? 'text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    {mins}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* RPE Slider */}
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-400 text-xs uppercase">
                Intensity (RPE)
              </Text>
              <Text
                className="font-bold"
                style={{ color: RPE_COLORS[session.rpe] }}
              >
                {session.rpe}
              </Text>
            </View>
            <View className="flex-row gap-1 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
                <Pressable
                  key={rpe}
                  onPress={() => updateSession(session.id, { rpe })}
                  className="flex-1 h-10 rounded justify-center"
                  style={{
                    backgroundColor:
                      rpe <= session.rpe ? RPE_COLORS[rpe] : '#1e293b',
                  }}
                >
                  <Text
                    className={`text-center text-xs ${
                      rpe <= session.rpe ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {rpe}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Load Calculation */}
            <View className="flex-row justify-between pt-4 border-t border-slate-800">
              <Text className="text-slate-400">Calculated Load</Text>
              <Text className="text-white font-bold">
                {calculateLoad(session.durationMin, session.rpe)} pts
              </Text>
            </View>
          </Animated.View>
        ))}

        {/* Add Session Button */}
        {sessions.length < 5 && (
          <Pressable
            onPress={addSession}
            className="py-4 border border-dashed border-slate-700 rounded-xl items-center mb-4"
          >
            <Plus color="#64748b" size={24} />
            <Text className="text-slate-400 mt-2">Add Session</Text>
          </Pressable>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
