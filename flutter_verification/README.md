# Flutter Verification Service

Identity verification using **on-device** ML Kit + FaceNet. No cloud face API required.

## Flow

1. **Capture** – ID photo + selfie (camera or gallery)
2. **Validate** – ML Kit ensures exactly one face in each image
3. **Compare** – FaceNet (ML Kit + TensorFlow) computes similarity on-device
4. **Submit** – If similarity > 80%, upload to storage and call Edge Function
5. **Edge Function** – Stores record with `pending_admin`; user sees "Verification Pending" badge
6. **Admin Panel** – Reviews and approves/rejects

## Setup

### 1. Add FaceNet model

Place `facenet.tflite` in `assets/models/`. Obtain from:

- [flutter-facenet-app](https://github.com/syeds-git/flutter-facenet-app) (check assets)
- Or convert a pre-trained FaceNet model to TFLite format

### 2. Deploy Edge Function

```bash
supabase functions deploy verify-faces
```

No AWS or other cloud credentials needed for the Edge Function.

### 3. Initialize in your app

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  await VerificationService.instance.init();
  runApp(MyApp());
}
```

## Usage

```dart
// Capture ID photo (camera or gallery)
final idFile = await VerificationService.instance.captureIdPhoto()
    ?? await VerificationService.instance.pickIdPhoto();

// Capture selfie
final selfieFile = await VerificationService.instance.captureSelfie()
    ?? await VerificationService.instance.pickSelfie();

if (idFile != null && selfieFile != null) {
  final result = await VerificationService.instance.verifyAndSubmit(
    idImage: idFile,
    selfieImage: selfieFile,
  );
  if (result.success) {
    // Show "Verification Pending" – admin will review
  } else {
    // Show result.error (e.g. "Face does not match ID. Please ensure good lighting and upload again.")
  }
}
```

## Error handling

- **Face does not match ID** – Similarity < 80%. User should retry with better lighting.
- **No face detected** – ML Kit validation failed. Ensure single face, good lighting.
- **Profile not found** – User must complete registration first.
- **Please sign in** – Supabase auth session required.
