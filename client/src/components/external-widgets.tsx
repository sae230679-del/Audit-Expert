import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface PublicSettings {
  yandexMetrikaEnabled?: boolean;
  yandexMetrikaId?: string;
  yandexWebmasterEnabled?: boolean;
  yandexWebmasterCode?: string;
  onlineConsultantEnabled?: boolean;
  onlineConsultantCode?: string;
  marquizEnabled?: boolean;
  marquizCode?: string;
}

export function ExternalWidgets() {
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/settings/public"],
  });

  useEffect(() => {
    if (!settings) return;

    if (settings.yandexMetrikaEnabled && settings.yandexMetrikaId) {
      const existingScript = document.getElementById("ym-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "ym-script";
        script.innerHTML = `
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
          ym(${settings.yandexMetrikaId}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
        `;
        document.head.appendChild(script);
      }
    }

    if (settings.yandexWebmasterEnabled && settings.yandexWebmasterCode) {
      const existingMeta = document.querySelector('meta[name="yandex-verification"]');
      if (!existingMeta) {
        const meta = document.createElement("meta");
        meta.name = "yandex-verification";
        meta.content = settings.yandexWebmasterCode;
        document.head.appendChild(meta);
      }
    }

    if (settings.onlineConsultantEnabled && settings.onlineConsultantCode) {
      const existingWidget = document.getElementById("online-consultant-widget");
      if (!existingWidget) {
        const container = document.createElement("div");
        container.id = "online-consultant-widget";
        container.innerHTML = settings.onlineConsultantCode;
        document.body.appendChild(container);
        const scripts = container.querySelectorAll("script");
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }
    }

    if (settings.marquizEnabled && settings.marquizCode) {
      const existingMarquiz = document.getElementById("marquiz-widget");
      if (!existingMarquiz) {
        const container = document.createElement("div");
        container.id = "marquiz-widget";
        container.innerHTML = settings.marquizCode;
        document.body.appendChild(container);
        const scripts = container.querySelectorAll("script");
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }
    }
  }, [settings]);

  return null;
}
