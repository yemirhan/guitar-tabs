import { useColorScheme } from 'react-native'
import { Stack } from 'expo-router/stack'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { QueriesObserver } from '@tanstack/react-query'
import { QueryClientProvider } from '@/providers/query-client'

export default function Layout() {
  const colorScheme = useColorScheme()
  return (
    <QueryClientProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Library', headerLargeTitle: true }} />
        <Stack.Screen name="player" options={{ title: '' }} />
      </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
