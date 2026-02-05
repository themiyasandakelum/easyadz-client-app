import 'dart:io';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

/// Result of a verification attempt.
class VerificationResult {
  final bool success;
  final String? error;
  final String? verificationStatus;

  const VerificationResult({
    required this.success,
    this.error,
    this.verificationStatus,
  });
}

/// Service for capturing ID photo and selfie, uploading to storage,
/// and submitting for manual admin verification.
class VerificationService {
  VerificationService._();
  static final VerificationService instance = VerificationService._();

  /// Capture ID photo using camera.
  Future<File?> captureIdPhoto() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return null;
    final controller = CameraController(
      cameras.first,
      ResolutionPreset.high,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    await controller.initialize();
    try {
      final xFile = await controller.takePicture();
      final dir = await getTemporaryDirectory();
      final filePath = path.join(
        dir.path,
        'id_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      final file = await File(filePath).writeAsBytes(
        await xFile.readAsBytes(),
      );
      return file;
    } finally {
      await controller.dispose();
    }
  }

  /// Capture selfie using front camera when available.
  Future<File?> captureSelfie() async {
    final cameras = await availableCameras();
    final frontCamera = cameras.cast<CameraDescription?>().firstWhere(
          (c) => c?.lensDirection == CameraLensDirection.front,
          orElse: () => cameras.isNotEmpty ? cameras.first : null,
        );
    if (frontCamera == null) return null;
    final controller = CameraController(
      frontCamera,
      ResolutionPreset.high,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    await controller.initialize();
    try {
      final xFile = await controller.takePicture();
      final dir = await getTemporaryDirectory();
      final filePath = path.join(
        dir.path,
        'selfie_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      final file = await File(filePath).writeAsBytes(
        await xFile.readAsBytes(),
      );
      return file;
    } finally {
      await controller.dispose();
    }
  }

  /// Pick ID photo from gallery (fallback).
  Future<File?> pickIdPhoto() async {
    final picker = ImagePicker();
    final xFile = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    return xFile != null ? File(xFile.path) : null;
  }

  /// Pick selfie from gallery (fallback).
  Future<File?> pickSelfie() async {
    final picker = ImagePicker();
    final xFile = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    return xFile != null ? File(xFile.path) : null;
  }

  /// Upload images and submit for manual admin verification.
  Future<VerificationResult> verifyAndSubmit({
    required File idImage,
    required File selfieImage,
  }) async {
    final supabase = Supabase.instance.client;
    final user = supabase.auth.currentUser;
    if (user == null) {
      return const VerificationResult(
        success: false,
        error: 'Please sign in to verify.',
      );
    }

    try {
      final profileRes = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
      final profileId = profileRes?['id'] as String?;
      if (profileId == null) {
        return const VerificationResult(
          success: false,
          error: 'Profile not found.',
        );
      }

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final idPath = 'profiles/$profileId/id_$timestamp.jpg';
      final selfiePath = 'profiles/$profileId/selfie_$timestamp.jpg';

      await supabase.storage.from('verifications').upload(idPath, idImage);
      await supabase.storage
          .from('verifications')
          .upload(selfiePath, selfieImage);

      final idUrl =
          supabase.storage.from('verifications').getPublicUrl(idPath);
      final selfieUrl =
          supabase.storage.from('verifications').getPublicUrl(selfiePath);

      final res = await supabase.functions.invoke(
        'verify-faces',
        body: {
          'id_image_url': idUrl,
          'selfie_url': selfieUrl,
          'profile_id': profileId,
        },
      );

      if (res.status != 200) {
        final err = res.data?['error'] ?? 'Verification submission failed.';
        return VerificationResult(
          success: false,
          error: err.toString(),
        );
      }

      return VerificationResult(
        success: true,
        verificationStatus: 'pending',
      );
    } on AuthException catch (e) {
      return VerificationResult(success: false, error: e.message);
    } catch (e) {
      return VerificationResult(success: false, error: e.toString());
    }
  }
}
