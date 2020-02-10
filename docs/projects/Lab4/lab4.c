#include "STM32L1xx.h"

#define SW1 GPIOA->IDR & 0x02
#define SW2 GPIOA->IDR & 0x04

uint8_t count = 0;
uint8_t count2 = 0;
uint8_t ledState1 = 0;
uint8_t ledState2 = 0;
int dir = 1;
void EXTI0_IRQHandler(){
	EXTI->PR = 0x00FFFFFF;
	ledState1 = !ledState1;
	d();
	dir = -1;
}
void EXTI1_IRQHandler(){
	EXTI->PR = 0x00FFFFFF;
	ledState2 = !ledState2;
	d();
	dir = 1;
}
void pinSetup() {
    RCC->APB1ENR |= 0x00000010;
    RCC->AHBENR  |= 0x05;
    GPIOA->MODER &= 0xFFFF0000;
    GPIOC->MODER &= ~0xFFFFFFFF;
    GPIOC->MODER |=  0x55555555;
}
void countF(uint8_t *count,int dir){
    *count += dir;
    if (*count == 255) {
        *count = 9;
    }
    else if (*count == 10) {
        *count = 0;
    }
}
void delay(){
    TIM6->SR = 0;	
    TIM6->PSC =  0xFFFF;
    TIM6->ARR = 30;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
void d(){
GPIOC->ODR = ((ledState2&0x01) << 9)|((ledState1&0x01) << 8)|((count2 & 0x0F) << 4) | (count & 0x0F);
}
	
int main(void){
    
		SYSCFG->EXTICR[0] = 0;
		EXTI->RTSR = 0x00FFFFFF;
		EXTI->EMR = 	0x00000003; 
	  EXTI->IMR = 	0x00000003; 
	  NVIC_EnableIRQ(EXTI0_IRQn);
	  NVIC_EnableIRQ(EXTI1_IRQn);
	  NVIC_ClearPendingIRQ(EXTI0_IRQn);  
	  NVIC_ClearPendingIRQ(EXTI1_IRQn);  
		pinSetup();
	  __enable_irq();
    while(1) {
				delay();
				countF(&count,1);
        d();
				delay();
				countF(&count,1);
				countF(&count2,dir);
        d();
    }
}