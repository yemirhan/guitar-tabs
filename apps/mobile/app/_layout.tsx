import { Stack } from 'expo-router/stack'

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Library', headerLargeTitle: true }} />
      <Stack.Screen name="player" options={{ title: '' }} />
    </Stack>
  )
}
