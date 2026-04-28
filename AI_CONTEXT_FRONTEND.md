# AI Context Frontend

## Project
Vehicle repair marketplace mobile app.

## Stack
- React Native
- Expo
- React Navigation
- JWT authentication
- Backend API in Django/DRF

## User Roles
1. Guest user
2. Authenticated vehicle owner
3. Authenticated repair shop user

## Current Known Structure
- Main navigation is in `src/navigation/AppNavigator.js`
- Owner drawer is in `src/navigation/HomeDrawer.js`
- Shop drawer is in `src/navigation/ShopDrawer.js`

## Important Current Screens
- `HomeScreen`
- `ShopHomeScreen`
- `LoginScreen`
- `RegisterScreen`
- `ShopMapScreen`
- `ShopDetailScreen`
- `VehicleDetailScreen`
- `CreateRepairScreen`
- `ClientLogRepairScreen`
- `ClientRequestRepairScreen`
- `RepairChatScreen`

## Important Rules
- Do not break existing authenticated owner flow
- Do not break existing shop flow
- Keep changes small and safe
- Prefer reusing current screens over large rewrites
- Public guest flow should be added carefully

## Known Legacy / Cleanup Notes
- `OfferChatScreen` is registered in navigation but appears unused in current flow
- Old commented routes exist in `AppNavigator.js`
- Cleanup should happen only after feature flow is stabilized