# Подготовка к Google Play и App Store

Этот репозиторий — релизная основа приложения. Сам выпуск в магазины выполняется из нативных проектов, потому что они требуют аккаунтов разработчика и секретных ключей, которые нельзя добавлять в репозиторий.

## Перед первым релизом

1. Зафиксируй `appId` из `capacitor.config.ts`. После публикации менять его нельзя.
2. Замени демонстрационные SVG из `resources/` на финальные и сгенерируй иконки:

   ```bash
   npx @capacitor/assets generate
   ```

3. Подготовь URL опубликованной [политики конфиденциальности](PRIVACY_POLICY.md), почту поддержки и минимум 5 скриншотов игры.
4. Протестируй новую сборку на реальном Android и iPhone: старт, пауза, прохождение каждого мира, сохранение прогресса, выход и повторный запуск.

## Google Play

1. Установи Android Studio и Android SDK.
2. Выполни:

   ```bash
   npm ci
   npm run cap:sync
   npx cap open android
   ```

3. В Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.
4. Создай upload key, не теряй файл ключа и пароль. В Play Console загружается файл `.aab`, а не APK.
5. В Play Console заполни карточку, раздел Data safety, рейтинг контента, возрастную аудиторию, политику конфиденциальности и сначала пройди Internal testing.

## Apple App Store

1. Нужны macOS, Xcode, Apple Developer Program и App Store Connect.
2. На Mac выполни:

   ```bash
   npm ci
   npm run cap:sync
   npx cap open ios
   ```

3. В Xcode открой target `App`, выбери свою Team и проверь Bundle Identifier `com.pixelquest.iskorka`.
4. Добавь иконки, проверь ландшафтную ориентацию и заполни privacy details в App Store Connect.
5. Выполни **Product → Archive → Distribute App → App Store Connect**. Затем прикрепи сборку к версии приложения в App Store Connect и отправь на review.

## Релизный чек-лист

- [ ] Номер версии и build number увеличены.
- [ ] Нет секретных ключей, паролей и сертификатов в Git.
- [ ] Все текстовые строки, иконки и скриншоты финальные.
- [ ] Ссылка на политику конфиденциальности опубликована.
- [ ] Проверены Android 7+ и актуальная iOS.
- [ ] Пройдены внутреннее тестирование Google Play и TestFlight.
