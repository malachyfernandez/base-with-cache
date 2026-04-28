import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useNukeDatabase, useTableCounts } from "../../../hooks/useNukeDatabase";

/**
 * Dev-only component to nuke all database tables
 * 
 * WARNING: This will permanently delete ALL data from your Convex database!
 * Only use this in development environments.
 */
export default function DatabaseNukeButton() {
  const { nukeAll } = useNukeDatabase();
  const { getCounts } = useTableCounts();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckCounts = async () => {
    setIsLoading(true);
    try {
      const result = await getCounts();
      setCounts(result);
    } catch (error) {
      console.error("Failed to get counts:", error);
      Alert.alert("Error", "Failed to get table counts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNuke = async () => {
    setIsLoading(true);
    try {
      const result = await nukeAll();
      const remainingCounts = await getCounts();
      const remainingTotal = Object.values(remainingCounts).reduce(
        (sum, count) => sum + count,
        0
      );

      setCounts(remainingCounts);

      Alert.alert(
        "Database Nuked",
        `Deleted rows:\n${JSON.stringify(result.deletedCounts, null, 2)}\n\nRemaining rows:\n${JSON.stringify(remainingCounts, null, 2)}\n\nRemaining total: ${remainingTotal}`
      );
    } catch (error: any) {
      console.error("Failed to nuke database:", error);
      Alert.alert("Error", `Failed to nuke database: ${error?.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="bg-red-900 border-b-2 border-red-600">
      <View className="p-3 mt-8">
        <Text className="text-white text-xs font-bold mb-2 text-center">
          🔥 DEV TOOLS - DATABASE NUKE 🔥
        </Text>
        
        <View className="flex-row gap-2 justify-center">
          <TouchableOpacity
            onPress={handleCheckCounts}
            disabled={isLoading}
            className="bg-blue-600 px-3 py-1 rounded"
          >
            <Text className="text-white text-xs">
              {isLoading ? "Loading..." : "Check Counts"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleNuke}
            disabled={isLoading}
            className="bg-red-600 px-3 py-1 rounded"
          >
            <Text className="text-white text-xs font-bold">
              ⚠️ NUKE ALL
            </Text>
          </TouchableOpacity>
        </View>

        {counts && (
          <ScrollView className="max-h-32 mt-2 bg-black rounded p-2">
            <Text className="text-green-400 text-xs font-mono">
              {JSON.stringify(counts, null, 2)}
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
