import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, Clock, FileCheck } from "lucide-react";

export function HeroSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            Соответствие 149-ФЗ и 152-ФЗ
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Проверьте ваш сайт на соответствие
            <span className="text-primary"> 149-ФЗ и 152-ФЗ</span> за 30 секунд
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Бесплатный экспресс-аудит по 9 критериям защиты персональных данных.
            Узнайте о нарушениях до проверки Роскомнадзора.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Бесплатная проверка</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Результат за 30 сек</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              <span>9 критериев</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
