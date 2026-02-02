import { Card, CardContent } from "@/components/ui/card";
import {
  Lock,
  FileText,
  CheckSquare,
  Cookie,
  Globe,
  FormInput,
  Phone,
  KeyRound,
  ClipboardList,
} from "lucide-react";

const criteria = [
  {
    icon: Lock,
    title: "HTTPS/SSL сертификат",
    description: "Проверка защищенного соединения и валидности сертификата",
  },
  {
    icon: FileText,
    title: "Политика конфиденциальности",
    description: "Наличие и корректность политики обработки персональных данных",
  },
  {
    icon: CheckSquare,
    title: "Согласие на ПДн",
    description: "Проверка форм согласия на обработку персональных данных",
  },
  {
    icon: Cookie,
    title: "Cookie-баннер",
    description: "Уведомление пользователей об использовании cookies",
  },
  {
    icon: Globe,
    title: "Иностранные ресурсы",
    description: "Анализ внешних скриптов и сервисов на соответствие требованиям",
  },
  {
    icon: FormInput,
    title: "Формы сбора данных",
    description: "Проверка полей форм и объема собираемых данных",
  },
  {
    icon: Phone,
    title: "Контактная информация",
    description: "Наличие контактов оператора персональных данных",
  },
  {
    icon: KeyRound,
    title: "Авторизация",
    description: "Проверка методов авторизации на соответствие требованиям РФ",
  },
  {
    icon: ClipboardList,
    title: "Реестр Роскомнадзора",
    description: "Проверка регистрации в реестре операторов ПДн",
  },
];

export function CriteriaSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            9 критериев проверки
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Мы проверяем ваш сайт по ключевым требованиям 149-ФЗ и 152-ФЗ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {criteria.map((item, index) => (
            <Card key={index} className="hover-elevate">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
