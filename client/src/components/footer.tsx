import { Shield, Mail, Phone, Send } from "lucide-react";
import { SiTelegram, SiVk } from "react-icons/si";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface PublicSettings {
  companyName?: string;
  companyType?: string;
  inn?: string;
  ogrn?: string;
  address?: string;
  phone?: string;
  email?: string;
  privacyEmail?: string;
  telegram?: string;
  vk?: string;
  bankName?: string;
  bankAccount?: string;
  bik?: string;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/settings/public"],
  });
  
  const defaultSettings = {
    companyName: "ИП Иванов Иван Иванович",
    companyType: "ИП",
    inn: "123456789012",
    ogrn: "123456789012345",
    address: "г. Москва, ул. Примерная, д. 1",
    phone: "+7 (999) 999-99-99",
    email: "support@help152fz.ru",
    privacyEmail: "privacy@help152fz.ru",
    telegram: "https://t.me/help152fz",
    vk: "https://vk.com/help152fz",
    bankName: "ПАО Сбербанк",
    bankAccount: "40802810000000000000",
    bik: "044525225",
    ...settings,
  };

  return (
    <footer className="border-t bg-card" id="contacts">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Help152FZ</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Сервис проверки сайтов на соответствие требованиям 149-ФЗ и 152-ФЗ
            </p>
            <div className="flex items-center gap-3">
              {defaultSettings.telegram && (
                <a
                  href={defaultSettings.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover-elevate p-2 rounded-md"
                  data-testid="link-telegram"
                >
                  <SiTelegram className="h-5 w-5" />
                </a>
              )}
              {defaultSettings.vk && (
                <a
                  href={defaultSettings.vk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover-elevate p-2 rounded-md"
                  data-testid="link-vk"
                >
                  <SiVk className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Реквизиты</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{defaultSettings.companyName}</p>
              <p>ИНН: {defaultSettings.inn}</p>
              <p>ОГРНИП: {defaultSettings.ogrn}</p>
              <p>{defaultSettings.address}</p>
              <p className="pt-2">
                Ответственный за ПДн: {defaultSettings.privacyEmail}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Документы</h3>
            <div className="space-y-2 text-sm">
              <Link
                href="/privacy"
                className="block text-muted-foreground hover-elevate px-2 py-1 -mx-2 rounded-md"
                data-testid="link-privacy"
              >
                Политика конфиденциальности
              </Link>
              <Link
                href="/terms"
                className="block text-muted-foreground hover-elevate px-2 py-1 -mx-2 rounded-md"
                data-testid="link-terms"
              >
                Пользовательское соглашение
              </Link>
              <Link
                href="/consent"
                className="block text-muted-foreground hover-elevate px-2 py-1 -mx-2 rounded-md"
                data-testid="link-consent"
              >
                Согласие на обработку ПДн
              </Link>
              <Link
                href="/offer"
                className="block text-muted-foreground hover-elevate px-2 py-1 -mx-2 rounded-md"
                data-testid="link-offer"
              >
                Договор-оферта
              </Link>
              <Link
                href="/cookies"
                className="block text-muted-foreground hover-elevate px-2 py-1 -mx-2 rounded-md"
                data-testid="link-cookies"
              >
                Политика cookies
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Контакты</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <a
                href={`mailto:${defaultSettings.email}`}
                className="flex items-center gap-2 hover-elevate px-2 py-1 -mx-2 rounded-md"
                data-testid="link-email"
              >
                <Mail className="h-4 w-4" />
                {defaultSettings.email}
              </a>
              <a
                href={`tel:${defaultSettings.phone?.replace(/\D/g, "")}`}
                className="flex items-center gap-2 hover-elevate px-2 py-1 -mx-2 rounded-md"
                data-testid="link-phone"
              >
                <Phone className="h-4 w-4" />
                {defaultSettings.phone}
              </a>
              <p className="text-xs pt-2">Время ответа: 24 часа в рабочие дни</p>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <span className="text-sm text-muted-foreground">
                Принимаем к оплате:
              </span>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-muted rounded text-xs font-medium">
                  СБП
                </div>
                <div className="px-3 py-1 bg-muted rounded text-xs font-medium">
                  ЮMoney
                </div>
                <div className="px-3 py-1 bg-muted rounded text-xs font-medium">
                  Банковская карта
                </div>
                <div className="px-3 py-1 bg-muted rounded text-xs font-medium">
                  Tinkoff Pay
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              © {currentYear} Help152FZ.ru. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
