import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const mobileRoot = path.resolve(scriptDir, '..')

const supportedExtensions = new Set(['.gp', '.gp2', '.gp3', '.gp4', '.gp5', '.gp7', '.gpx'])

function usage() {
  console.log(`Seed Guitar Pro fixtures into the iOS Simulator app container.

Usage:
  npm run seed:sim -w @gtr/mobile -- [options]

Options:
  --device <udid|name>    Seed one simulator. Defaults to all booted simulators.
  --all-booted           Seed all booted simulators.
  --fixtures <dir>       Fixture directory. Defaults to apps/mobile/fixtures/scores.
  --bundle-id <id>       App bundle id. Defaults to com.yemirhan.guitartabreader.
  --append               Preserve existing library entries and add fixtures first.
  --help                 Show this help.
`)
}

function parseArgs(argv) {
  const args = {
    allBooted: false,
    append: false,
    bundleId: 'com.yemirhan.guitartabreader',
    device: null,
    fixturesDir: path.join(mobileRoot, 'fixtures', 'scores')
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--all-booted':
        args.allBooted = true
        break
      case '--append':
        args.append = true
        break
      case '--bundle-id':
        args.bundleId = requireValue(argv, ++i, arg)
        break
      case '--device':
      case '-d':
        args.device = requireValue(argv, ++i, arg)
        break
      case '--fixtures':
        args.fixturesDir = path.resolve(requireValue(argv, ++i, arg))
        break
      case '--help':
      case '-h':
        usage()
        process.exit(0)
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function requireValue(argv, index, flag) {
  const value = argv[index]
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function xcrun(args) {
  return execFileSync('xcrun', args, { encoding: 'utf8' }).trim()
}

function listBootedDevices() {
  const output = xcrun(['simctl', 'list', 'devices', 'booted', '--json'])
  const parsed = JSON.parse(output)
  return Object.values(parsed.devices)
    .flat()
    .filter((device) => device.state === 'Booted')
}

function findBootedDevice(deviceQuery) {
  const booted = listBootedDevices()
  const normalized = deviceQuery.toLowerCase()
  return booted.find(
    (device) =>
      device.udid === deviceQuery ||
      device.name.toLowerCase() === normalized ||
      device.name.toLowerCase().includes(normalized)
  )
}

async function listFixtureFiles(fixturesDir) {
  const entries = await readdir(fixturesDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

async function loadExistingLibrary(libraryPath) {
  try {
    const parsed = JSON.parse(await readFile(libraryPath, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function seedDevice(device, args, fixtureFiles) {
  const container = xcrun(['simctl', 'get_app_container', device.udid, args.bundleId, 'data'])
  const scoresDir = path.join(container, 'Documents', 'scores')
  const libraryPath = path.join(container, 'Documents', 'library.json')
  await mkdir(scoresDir, { recursive: true })

  if (!args.append) {
    const existingScores = await readdir(scoresDir, { withFileTypes: true })
    await Promise.all(
      existingScores
        .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
        .map((entry) => rm(path.join(scoresDir, entry.name)))
    )
  }

  for (const fileName of fixtureFiles) {
    await cp(path.join(args.fixturesDir, fileName), path.join(scoresDir, fileName))
  }

  const fixtureEntries = fixtureFiles.map((fileName, index) => ({
    filePath: fileName,
    fileName,
    addedAt: Date.now() + index
  }))

  let nextLibrary = fixtureEntries
  if (args.append) {
    const fixtureNames = new Set(fixtureFiles)
    const existing = await loadExistingLibrary(libraryPath)
    nextLibrary = [...fixtureEntries, ...existing.filter((entry) => !fixtureNames.has(entry.fileName))]
  }

  await writeFile(libraryPath, JSON.stringify(nextLibrary))
  console.log(`seeded ${fixtureFiles.length} fixture(s) into ${device.name} (${device.udid})`)
}

const args = parseArgs(process.argv.slice(2))
const devices = args.device
  ? [findBootedDevice(args.device)].filter(Boolean)
  : listBootedDevices()

if (devices.length === 0) {
  throw new Error(
    args.device
      ? `No booted simulator matched "${args.device}".`
      : 'No booted simulators found. Boot a simulator first or pass --device <udid|name>.'
  )
}

const fixtureFiles = await listFixtureFiles(args.fixturesDir)
if (fixtureFiles.length === 0) {
  throw new Error(`No Guitar Pro fixture files found in ${args.fixturesDir}`)
}

for (const device of devices) {
  await seedDevice(device, args, fixtureFiles)
}
