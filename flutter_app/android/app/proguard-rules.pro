# Flutter specific rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Riverpod / Dart reflection
-keep class * extends java.lang.annotation.Annotation { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Suppress warnings for missing classes
-dontwarn com.google.android.play.core.**
