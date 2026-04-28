import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle the OAuth callback and redirect to main app
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-text text-lg">Signing you in...</Text>
    </View>
  );
}
