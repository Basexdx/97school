# 97school App

Кроссплатформенное приложение на Flutter для Android, iOS, Windows, macOS и Linux.

## MVP
- Главный экран и прогресс
- Каталог задач
- Проверка ответа и подсказки
- XP за первое правильное решение
- Локальное сохранение прогресса
- Рейтинг
- Профиль
- Адаптивная ширина для телефона и ПК

## Подготовка платформ

После установки Flutter SDK из папки `mobile` выполните:

```bash
flutter create . --platforms=android,ios,windows,macos,linux
flutter pub get
flutter run
```

На Windows для запуска desktop-версии потребуется Visual Studio с workload Desktop development with C++.
Для Android потребуется Android Studio/Android SDK. Сборка iOS выполняется на macOS с Xcode.

## Следующий этап

Авторизация, облачная база, роли ученик/учитель, синхронизация рейтинга и серверная проверка решений.
